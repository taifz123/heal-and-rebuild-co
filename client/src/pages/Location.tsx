import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapView } from "@/components/Map";
import { Link } from "wouter";
import { ArrowLeft, MapPin, Car, Clock, Phone } from "lucide-react";

export default function Location() {
  const location = {
    address: "123 Wellness Boulevard, Downtown District",
    city: "Your City, State 12345",
    phone: "(555) 123-4567",
    coordinates: { lat: 40.7128, lng: -74.0060 }, // Default to NYC, update as needed
  };

  const handleMapReady = (map: google.maps.Map) => {
    // Add marker for the gym location
    new google.maps.Marker({
      position: location.coordinates,
      map: map,
      title: "Heal & Rebuild Co",
    });

    // Center map on location
    map.setCenter(location.coordinates);
    map.setZoom(15);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <Link href="/">
              <div className="text-2xl font-bold tracking-tight cursor-pointer">
                HEAL & REBUILD CO
              </div>
            </Link>
            <Link href="/dashboard">
              <Button variant="default" size="sm">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
          <Link href="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-5xl lg:text-6xl font-light mb-4">Visit Us</h1>
            <p className="text-xl text-muted-foreground font-light">
              Find directions, parking, and everything you need for your visit
            </p>
          </div>

          {/* Map */}
          <div className="mb-12">
            <Card className="border-2 overflow-hidden">
              <div className="h-[500px]">
                <MapView onMapReady={handleMapReady} />
              </div>
            </Card>
          </div>

          {/* Location Details */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="h-8 w-8" />
                  <CardTitle className="text-2xl">Address</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg">{location.address}</p>
                <p className="text-lg text-muted-foreground">{location.city}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`, '_blank')}
                >
                  Get Directions
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Phone className="h-8 w-8" />
                  <CardTitle className="text-2xl">Contact</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg">{location.phone}</p>
                <p className="text-muted-foreground">Call us for inquiries</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => window.location.href = `tel:${location.phone}`}
                >
                  Call Now
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-8 w-8" />
                  <CardTitle className="text-2xl">Opening Hours</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span className="text-muted-foreground">6:00 AM - 10:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="text-muted-foreground">7:00 AM - 9:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="text-muted-foreground">8:00 AM - 8:00 PM</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Car className="h-8 w-8" />
                  <CardTitle className="text-2xl">Parking</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2"></div>
                  <p>Free parking available in our dedicated lot</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2"></div>
                  <p>Street parking available on Wellness Boulevard</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2"></div>
                  <p>Public parking garage 2 blocks away</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2"></div>
                  <p>Bike racks available at main entrance</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nearby Amenities */}
          <div className="mt-12">
            <h2 className="text-3xl font-light mb-6">Nearby Amenities</h2>
            <Card className="border-2">
              <CardContent className="py-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Dining</h3>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Organic Café (2 min walk)</li>
                      <li>• Juice Bar (1 min walk)</li>
                      <li>• Healthy Eats (5 min walk)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Shopping</h3>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Wellness Store (next door)</li>
                      <li>• Sports Equipment (3 min walk)</li>
                      <li>• Pharmacy (2 min walk)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Transit</h3>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Metro Station (5 min walk)</li>
                      <li>• Bus Stop (1 min walk)</li>
                      <li>• Bike Share (outside)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
